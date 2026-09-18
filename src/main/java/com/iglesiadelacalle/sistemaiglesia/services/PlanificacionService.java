package com.iglesiadelacalle.sistemaiglesia.services;

import com.iglesiadelacalle.sistemaiglesia.dto.PlanificacionRequestDTO;
import com.iglesiadelacalle.sistemaiglesia.models.*;
import com.iglesiadelacalle.sistemaiglesia.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class PlanificacionService {

    @Autowired private PlanificacionRepository planificacionRepository;
    @Autowired private ClaseTeologiaRepository claseTeologiaRepository;
    @Autowired private ActividadRepository actividadRepository;

    @Transactional
    public void guardarPlanificacion(PlanificacionRequestDTO request) {
        
        // 1. Buscar la clase
        ClaseTeologia clase = claseTeologiaRepository.findById(request.getIdClaseTeologia())
                .orElseThrow(() -> new RuntimeException("La clase especificada no existe en el sistema."));

        // 2. Validación de Año Académico
        int anioActual = ZonedDateTime.now(ZoneId.of("America/Caracas")).getYear();
        if (clase.getAnio() != anioActual) {
            throw new RuntimeException("Bloqueado: No se puede modificar el plan de años académicos cerrados.");
        }

        // 3. Validación de Cantidad de Evaluaciones
        if (request.getEvaluaciones() == null || request.getEvaluaciones().size() < 3 || request.getEvaluaciones().size() > 5) {
            throw new RuntimeException("Error: Debe registrar estrictamente entre 3 y 5 evaluaciones.");
        }

        // 4. Validación de Ponderación (100%)
        int sumaPonderacion = request.getEvaluaciones().stream()
                .mapToInt(PlanificacionRequestDTO.EvaluacionDTO::getPonderacion).sum();

        if (sumaPonderacion != 100) {
            throw new RuntimeException("Inconsistencia: La suma de los pesos debe ser exactamente 100%. Actualmente suma: " + sumaPonderacion + "%.");
        }

        // ⚡ 5. VALIDACIÓN DE FECHAS (RANGOS Y DUPLICADOS) ⚡
        Set<LocalDate> fechasOcupadas = new HashSet<>();

        for (PlanificacionRequestDTO.EvaluacionDTO evalDTO : request.getEvaluaciones()) {
            if (evalDTO.getFechaPlanif() == null) {
                throw new RuntimeException("Todas las evaluaciones deben tener una fecha de aplicación programada.");
            }
            
            // Validar que no se salga de la clase
            if (evalDTO.getFechaPlanif().isBefore(clase.getFechaInicio()) || evalDTO.getFechaPlanif().isAfter(clase.getFechaFin())) {
                throw new RuntimeException("La evaluación '" + evalDTO.getContenidoEvaluar() + "' está fuera del rango de fechas de la clase.");
            }

            // ⚡ Validar que NO SE REPITAN fechas entre evaluaciones ⚡
            if (!fechasOcupadas.add(evalDTO.getFechaPlanif())) {
                throw new RuntimeException("Cruce de Fechas: No pueden haber dos evaluaciones programadas para el mismo día (" + evalDTO.getFechaPlanif() + ").");
            }
        }

        // 6. Limpieza y Guardado
        List<Planificacion> planificacionesAntiguas = planificacionRepository.findByClaseTeologia_IdClaseTeologia(clase.getIdClaseTeologia());
        if (!planificacionesAntiguas.isEmpty()) {
            planificacionRepository.deleteAll(planificacionesAntiguas);
        }

        List<Planificacion> planificacionesAGuardar = new ArrayList<>();
        
        for (PlanificacionRequestDTO.EvaluacionDTO evalDTO : request.getEvaluaciones()) {
            Planificacion plan = new Planificacion();
            plan.setContenidoEvaluar(evalDTO.getContenidoEvaluar());
            plan.setEscala(evalDTO.getEscala());
            plan.setPonderacion(evalDTO.getPonderacion());
            plan.setFechaPlanif(evalDTO.getFechaPlanif()); 
            plan.setClaseTeologia(clase);
            plan.setTema(clase.getTema()); 

            Actividad actividadExistente = actividadRepository.findById(evalDTO.getActividad().getIdActividad())
                    .orElseThrow(() -> new RuntimeException("El tipo de actividad seleccionado no existe."));
            
            plan.setActividad(actividadExistente);
            planificacionesAGuardar.add(plan);
        }

        planificacionRepository.saveAll(planificacionesAGuardar);
    }
}
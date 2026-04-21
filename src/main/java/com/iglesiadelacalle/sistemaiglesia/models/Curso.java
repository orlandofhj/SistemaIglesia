package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;
import java.util.List;
import java.time.LocalDate;
import java.time.ZoneId;

@Entity
@Table(name = "curso")
public class Curso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idCurso;

    @Column(name = "anio", nullable = false)
    private Integer anio; // Año con la zona horaria de Caracas

    // 🔥 NUEVO CAMPO: Fecha exacta de la creación de la clase 🔥
    @Column(name = "fecha_inscripcion", nullable = false, updatable = false)
    private LocalDate fechaInscripcion;

    @ManyToOne
    @JoinColumn(name = "id_bloque", nullable = false)
    private Bloque bloque;

    @ManyToOne
    @JoinColumn(name = "id_instructor", nullable = false)
    private Persona instructor;

    // Relación Muchos a Muchos para los estudiantes inscritos (CON EAGER PARA QUE LLEGUE A JS)
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "curso_estudiante",
        joinColumns = @JoinColumn(name = "id_curso"),
        inverseJoinColumns = @JoinColumn(name = "id_estudiante")
    )
    private List<Persona> estudiantes;

    @Column(length = 20)
    private String estado = "Activo"; // Puede ser "Activo" o "Finalizado"

    // --- MAGIA DE LA FECHA (Se ejecuta justo antes de guardar en BD) ---
    @PrePersist
    protected void onCreate() {
        this.fechaInscripcion = LocalDate.now(ZoneId.of("America/Caracas"));
    }

    // --- GETTERS Y SETTERS ---

    public Integer getIdCurso() {
        return idCurso;
    }

    public void setIdCurso(Integer idCurso) {
        this.idCurso = idCurso;
    }

    public Integer getAnio() {
        return anio;
    }

    public void setAnio(Integer anio) {
        this.anio = anio;
    }

    public LocalDate getFechaInscripcion() {
        return fechaInscripcion;
    }

    public void setFechaInscripcion(LocalDate fechaInscripcion) {
        this.fechaInscripcion = fechaInscripcion;
    }

    public Bloque getBloque() {
        return bloque;
    }

    public void setBloque(Bloque bloque) {
        this.bloque = bloque;
    }

    public Persona getInstructor() {
        return instructor;
    }

    public void setInstructor(Persona instructor) {
        this.instructor = instructor;
    }

    public List<Persona> getEstudiantes() {
        return estudiantes;
    }

    public void setEstudiantes(List<Persona> estudiantes) {
        this.estudiantes = estudiantes;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }
}
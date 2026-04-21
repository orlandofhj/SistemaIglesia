package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.Planificacion;

@Repository
public interface PlanificacionRepository extends JpaRepository<Planificacion, Integer> {
}